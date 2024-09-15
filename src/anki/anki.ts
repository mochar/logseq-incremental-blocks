const ANKI_PORT = 8765;

export async function invoke(action: string, params = {}): Promise<any> {
  return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("error", () => reject("Failed to issue request. Is Anki open?"));
      xhr.addEventListener("load", () => {
          try {
              const response = JSON.parse(xhr.responseText);
              if (Object.getOwnPropertyNames(response).length != 2) {
                  throw "Response has an unexpected number of fields";
              }
              if (!response.hasOwnProperty("error")) {
                  throw "Response is missing required error field";
              }
              if (!response.hasOwnProperty("result")) {
                  throw "Response is missing required result field";
              }
              if (response.error) {
                  throw response.error;
              }
              resolve(response.result);
          } catch (e) {
              reject(e);
          }
      });

      xhr.open("POST", "http://127.0.0.1:" + ANKI_PORT.toString());
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify({action, version: 6, params}));
  });
}

export async function getAnkiModelName() : Promise<string | null> {
  const graph = await logseq.App.getCurrentGraph();
  if (graph == null) return null;
  return `${graph.name}Model`;
}

export async function getLogseqCards({ due=false, deck }: { due?: boolean, deck?: string }) : Promise<Map<string, any>[]> {
  const modelName = await getAnkiModelName();
  if (modelName == null) return [];
  let query = `note:${modelName}`;
  if (due) query = `(is:due or is:new) ${query}`;
  if (deck) query = `${query} deck:${deck}`;
  const cardIds = await invoke('findCards', { query });
  const cardsData = await invoke('cardsInfo', { cards: cardIds });
  console.log('cards data', cardsData);
  return cardsData;
}