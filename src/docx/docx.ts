import { BlockEntity, BlockUUID, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { generateNewIbProps } from "../ib/create";
import { parseHtml } from "../utils/utils";

export async function generateNewDocIbProps(uuid?: string) : Promise<Record<string, any>> {
  const props = await generateNewIbProps(uuid);
  props['ib-readpoint'] = 0;
  return props;
}

interface ICreateDoc {
  html: string,
  title: string,
	uuid?: BlockUUID,
  parent?: BlockUUID
}

export async function createDoc({ title, html, uuid, parent }: ICreateDoc) : Promise<BlockEntity | PageEntity | null> {
	if (!uuid) uuid = await logseq.Editor.newBlockUUID();
	const storage = logseq.Assets.makeSandboxStorage();
	const filename = `${uuid}.html`;

	if (await storage.hasItem(filename)) {
		logseq.UI.showMsg('Asset already exists with given title', 'error');
		return null;
	}

	const properties = await generateNewDocIbProps(uuid);
	let blockOrPage: PageEntity | BlockEntity;
	if (parent) {
		blockOrPage = await logseq.Editor.insertBlock(parent, title, { properties });
	} else {
		blockOrPage = await logseq.Editor.createPage(title, properties, { redirect: true });
		const document = parseHtml(html);
		const styleEl = document.createElement('style');
		styleEl.innerHTML = `
    .extract {
      background: pink;
      cursor: pointer;
    }`;
		document.head.appendChild(styleEl);
		html = document.documentElement.outerHTML;
	}

	if (blockOrPage == null) {
		logseq.UI.showMsg('Failed to create block/page', 'error');
		return null;
	}
	
	// Store file
	await storage.setItem(filename, html);

	return blockOrPage;
}
