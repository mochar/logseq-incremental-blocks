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

export async function getDueLogseqCards() : Promise<Map<string, any>[]> {
  const graph = await logseq.App.getCurrentGraph();
  if (graph == null) return [];
  const cardIds = await invoke('findCards', {
    query: `(is:due or is:new) note:${graph.name}Model`
  });
  const cardsData = await invoke('cardsInfo', { cards: cardIds });
  return cardsData;
}