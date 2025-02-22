import { Readability } from "@mozilla/readability";
import React, { useMemo } from "react";
import { Article } from "./types";
import ExtractPanel from "./ExtractPanel";
import { importHtml } from "./importSlice";
import { useAppDispatch } from "../state/hooks";
import { setModalView } from "../state/viewSlice";

export default function HtmlUpload() {
  const [title, setTitle] = React.useState<string>('');
  const [article, setArticle] = React.useState<Article>(null);
  const [readable, setReadable] = React.useState<boolean>(false);
	const dispatch = useAppDispatch();

	const html = useMemo(() => {
    if (!article) return;
    const content = readable ? article.readableContent : article.content;
		return content;
	}, [article, readable]);

  async function upload() {
    //@ts-ignore
    const [fileHandle] = await showOpenFilePicker();
    if (!fileHandle || fileHandle.kind !== 'file') return;
    const file = await fileHandle.getFile() as File;
    if (file.type !== 'text/html') return;
    if (file.name) setTitle(file.name);
    const content = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const article = new Readability(doc).parse();
    setTitle(article.title);
    setArticle({ content, readableContent: article.content });
  }

	async function importThing() {
		if (!html) return;
		const success = await dispatch(importHtml(title, html));
		if (success) {
			dispatch(setModalView(null));
		}
	}
	
	return (
		<>
			<div>
				<div className="flex space-x-2">
					<button
						onClick={upload}
						className="p-1 px-2 hover:bg-secondary border"
					>
						<span>Upload</span>
					</button>
					<input
						type="text"
						placeholder="Title"
						className="py-1"
						value={title}
						onChange={e => setTitle(e.target.value)}
					/>
				</div>
				{html && (
					<div>
						<hr className="my-2" />
						<label className="flex items-center space-x-1">
							<input
								type="checkbox"
								checked={readable}
								onChange={e => setReadable(!readable)}
							/>
							<span>Readable</span>
						</label>
						<iframe width={640} height={360} srcDoc={html}></iframe>
					</div>
				)}
			</div>
			      
      <hr className="my-2" />
      
      <ExtractPanel importThing={importThing} />
		</>
	);
}
