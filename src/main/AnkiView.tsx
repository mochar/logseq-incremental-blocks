import React from "react";
import * as theme from "../utils/theme";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { AnkiCard, getDueCards, selectCardsByCriteria } from "../anki/ankiSlice";
import { GroupedVirtuoso } from "react-virtuoso";
import { gotBusy } from "./mainSlice";
import { convertBlockToIb } from "../logseq/command";
import { getLogseqCards } from "../anki/anki";
import IncrementalBlock from "../IncrementalBlock";

export default function AnkiView() {
  const dispatch = useAppDispatch();
  const refreshState = useAppSelector(state => state.anki.refreshState);
  const [convertView, setConvertView] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (refreshState == null) {
      refresh();
    }
  }, []);

  async function refresh() {
    await dispatch(getDueCards());
  }

  let content = <></>;
  if (refreshState == 'failed') {
    content = <div className="muted">
      <p>Could not connect with Anki.</p>
      <p>Check if Anki is open and anki-connect is installed.</p>
    </div>;
  } else if (refreshState == null) {
  } else if (convertView) {
    content = <AnkiConvertContent setConvertView={setConvertView} />
  } else {
    content = <AnkiCardsContent/>
  }

  return (
  <div>
    <div className="flex justify-between items-center mb-1">
      <div>
        <span>Due cards</span>
      </div>
      <div>
        <button
          onClick={() => setConvertView(!convertView)}
          className={`p-1 ${convertView ? theme.BG_ACTIVE : theme.BG.hover } ${theme.BORDER} rounded`}
        >
          Convert to ibs
        </button>
        
        <button 
          className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-1 rounded`}
          onClick={() => refresh()}
        >
          🔄 Refresh
        </button>
      </div>
    </div>

    <hr className="dark:border-gray-800"></hr> 

    {content}
  </div>
  )
}

function AnkiConvertContent({ setConvertView }: { setConvertView: React.Dispatch<boolean> }) {
  const dispatch = useAppDispatch();
  const [result, setResult] = React.useState<string>();

  async function convert() {
    dispatch(gotBusy(true));
    try {
      const cards = await getLogseqCards({}) as any[];
      const status = { converted: 0, alreadyIb: 0, noBlock: 0 };
      await Promise.all(cards.map(async (card) => {
        const uuid = card.fields.uuid.value;
        if (!uuid) return;
        const block = await logseq.Editor.getBlock(uuid);
        if (!block) {
          status.noBlock++;
          return;
        }
        const ib = IncrementalBlock.fromBlock(block);
        if (ib.beta == null) {
          await convertBlockToIb({ uuid, block: block, priorityOnly: true });
          status.converted++;
        } else {
          status.alreadyIb++;
        }
      }));
      setResult(`Converted ${status.converted} blocks`)
    } catch (e: any) {
      setResult('Conversion failed: ' + e.toString());
    } finally {
      dispatch(gotBusy(false));
    }
  }

  return (
  <div className="py-1 space-y-1">
    <div className="flex flex-col">
      <span>Convert ALL anki blocks to ibs?</span>
      <span>This will add a priority properties to your anki cards.</span>      
    </div>

    <div className="flex">
      <button 
        className={`bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded`}
        onClick={convert}
      >
        Convert
      </button>     
    </div>

    {result != undefined && <span>{ result }</span>}
  </div>
  );
}

function AnkiCardsContent() {
  const [isIb, setIsIb] = React.useState<boolean>(false);
  const filteredDeckName = useAppSelector(state => state.anki.deckName);
  const cards = useAppSelector(state => selectCardsByCriteria(state, false, isIb));

  const cardsByDeck = React.useMemo(() => {
    const byDeck = new Map<string, AnkiCard[]>();
    for (const card of cards) {
      if (byDeck.has(card.deckName)) {
        byDeck.get(card.deckName)?.push(card);
      } else {
        byDeck.set(card.deckName, [card]);
      }
    }
    if (byDeck.get(filteredDeckName) == undefined) {
      byDeck.set(filteredDeckName, []);
    }
    return byDeck;
  }, [cards]);

  // Make sure our filtered deck is first
  const decks = [
    filteredDeckName, 
    ...[...cardsByDeck.keys()].filter((d) => d != filteredDeckName)];
  const deckCounts = decks.map((deck) => cardsByDeck.get(deck)!.length);

  let deckView;
  if (cards.length > 0) {
    deckView = (
    <div className="mt-1">
      <GroupedVirtuoso
        style={{ height: '380px', overflowX: 'clip' }}
        groupCounts={deckCounts}
        groupContent={(i) => {
          const deck = decks[i];
          const isFiltered = deck == filteredDeckName;
          const isEmpty = deckCounts[i] == 0;
          return <div className="py-1">
            <h4 className={`font-medium ${isFiltered && "bg-gray-100 dark:bg-gray-700"}`}>
              Deck: { deck }
            </h4>
            {isFiltered && isEmpty && 
              <span className="text-xs">
                Rebuild filtered deck to interleave cards with reading.
              </span>
            }
          </div>
        }}
        itemContent={(i, iDeck) => CardItem({ card: cardsByDeck.get(decks[iDeck])![i] })}
      ></GroupedVirtuoso>
    </div>
    );
  } else {
    deckView = (
      <div className="text-neutral-500 flex justify-center">
        <span>No cards found.</span>
      </div>
    );
  }

  return (
  <>
{/*     <div className="flex py-2 px-1 items-baseline justify-between">
      <span>Due cards</span>
    
      <div className="flex space-x space-x-2">
        <label>
          <input 
            type="checkbox" 
            onChange={() => setIsIb(!isIb)}
            checked={isIb}
          />
          IB
        </label>
      </div>
    </div> */}

    {deckView}
  </>
  );
}

function CardItem({ card }: { card: AnkiCard }) {
  return (
  <div className="flex items-baseline justify-between py-1">
    <span>{card.cardId} | { card.breadcrumb }</span>
    { card.priority && <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
      IB
    </span>}
  </div>
  );
}