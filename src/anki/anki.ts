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

export async function extractSourcesFromCard(content: string) : Promise<Map<string, string>> {
  const regex = /src="([^"]*)"/g;
  const sources = [...content.matchAll(regex)].map((r) => r[1]).filter((s) => !s.startsWith('_'));
  const contents = new Map<string, string>();
  await Promise.all(
    sources.map(async (s) => contents.set(s, atob(await invoke('retrieveMediaFile', { filename: s }))))
  );
  return contents;
}

export interface CardData {
  question: string,
  answer: string,
  deckName: string,
  modelName: string,
  fieldOrder: number,
  fields: any,
  css: string,
  cardId: number,
  interval: number,
  note: number,
  ord: number,
  type: number,
  queue: number,
  due: number,
  reps: number,
  lapses: number,
  left: number,
  mod: number
}

export async function getCardData(cardIds: number[]) : Promise<CardData[]> {
  const data = await invoke('cardsInfo', { cards: cardIds });
  return data as CardData[];
}

export interface DeckReview {
  reviewTime: number,
  cardID: number,
  usn: number,
  buttonPressed: number,
  newInterval: number,
  previousInterval: number,
  newFactor: number,
  reviewDuration: number,
  reviewType: number
}

export async function getDeckReviews(deck: string, sinceUnix: number) : Promise<DeckReview[]> {
  const reviews = await invoke('cardReviews', { deck, startID: sinceUnix });
  return reviews.map((r: any) => {
    return {
      reviewTime: r[0],
      cardID: r[1],
      usn: r[2],
      buttonPressed: r[3],
      newInterval: r[4],
      previousInterval: r[5],
      newFactor: r[6],
      reviewDuration: r[7],
      reviewType: r[8]
    };
  });
}

// https://github.com/ankidroid/Anki-Android/wiki/Database-Structure#review-log
export interface CardReview {
  // epoch-milliseconds timestamp of when you did the review
  id: number,
  // update sequence number: for finding diffs when syncing
  usn: number, 
  // which button you pushed to score your recall. 
  // review:  1(wrong), 2(hard), 3(ok), 4(easy)
  // learn/relearn:   1(wrong), 2(ok), 3(easy)
  ease: number,
  // interval (i.e. as in the card table)
  ivl: number,
  // last interval, i.e. the last value of ivl. Note that this value is not
  // necessarily equal to the actual interval between this review and the
  // preceding review.
  lastIvl: number,
  // factor
  factor: number,
  // how many milliseconds your review took, up to 60000 (60s)
  time: number,
  // 0=learn, 1=review, 2=relearn, 3=filtered, 4=manual
  type: number, 
}

interface CardReviews {
  [key: string]: CardReview[]
}

export async function getCardReviews(cardIds: number[]) : Promise<CardReviews> {
  const reviews = await invoke('getReviewsOfCards', { cards: cardIds });
  return reviews as CardReviews;
}
