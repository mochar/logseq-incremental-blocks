
export function highlightSelection(selection: Selection, document: Document, classes: Array<string>) {
	let range = selection.getRangeAt(0);
	let startNode = range.startContainer;
	let endNode = range.endContainer;
	let startOffset = range.startOffset;
	let endOffset = range.endOffset;

	console.log(selection, range);

	// Handle selection within a single text node
	if (startNode === endNode) {
		wrapSelectedNode(startNode, startOffset, endOffset, classes);
		return;
	}

	// Handle multi-node selection
	let commonAncestor = range.commonAncestorContainer;
	let walker = document.createTreeWalker(commonAncestor, NodeFilter.SHOW_TEXT, null);
	let isHighlighting = false;

	const nodesToWrap = Array<Node>();
	while (walker.nextNode()) {
		let currentNode = walker.currentNode;

		if (currentNode === startNode) {
			isHighlighting = true;
			nodesToWrap.push(currentNode);
		} else if (isHighlighting) {
			nodesToWrap.push(currentNode);
			if (currentNode === endNode) break;
		}
	}

	for (const node of nodesToWrap) {
		if (node === startNode) {
			wrapSelectedNode(node, startOffset, null, classes);
		} else if (node === endNode) {
			wrapSelectedNode(node, 0, endOffset, classes);
		} else {
			wrapSelectedNode(node, 0, null, classes);
		}
	}
}

function wrapSelectedNode(node: Node, startOffset: number, endOffset: number | null, classes: Array<string>) : Node {
	if (node.nodeType === Node.TEXT_NODE) {
		return wrapSelectedText(node, startOffset, endOffset, classes);
	}
}

function wrapSelectedText(textNode: Node, startOffset: number, endOffset: number | null, classes: Array<string>) : Node {
	let text = textNode.nodeValue;
	let parent = textNode.parentNode;

	let beforeText = text.substring(0, startOffset);
	let highlightText = text.substring(startOffset, endOffset !== null ? endOffset : text.length);
	let afterText = endOffset !== null ? text.substring(endOffset) : "";

	let span = document.createElement('span');
	classes.forEach(c => span.classList.add(c));
	span.textContent = highlightText;

	if (beforeText) parent.insertBefore(document.createTextNode(beforeText), textNode);
	parent.insertBefore(span, textNode);
	if (afterText) parent.insertBefore(document.createTextNode(afterText), textNode);

	parent.removeChild(textNode);
	return span;
}

