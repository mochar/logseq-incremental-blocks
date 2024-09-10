import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { invoke } from "../anki/anki";
import * as theme from "../utils/theme";

export default function CardComponent() {
  const dispatch = useAppDispatch();
  const qib = useAppSelector(state => state.learn.current!.qib);
  const cardId = qib.cardId!;
  const cardMedia = useAppSelector(state => state.anki.media);
  const [card, setCard] = React.useState();
  const [error, setError] = React.useState<string>();
  const busy = error == undefined && card == undefined;

  React.useEffect(() => {
    setCard(undefined);
    setError(undefined);
    setupCard();
  }, [qib]);

  async function setupCard() {
    try {
      const cardsData = await invoke('cardsInfo', { cards: [cardId] });
      if (cardsData.length == 1) {
        console.log(cardsData[0]);
        setCard(cardsData[0]);
        const deckName = 'Incremental blocks';
        await invoke('changeDeck', { cards: [cardId], deck: deckName });
        await invoke('guiDeckReview', { name: deckName });
        await invoke('guiShowQuestion');
      } else {
        setError('Failed to fetch card.')
      }
    } catch (error) {
      setError(error as string);
    }
  }

  let cardContent = <></>;
  if (error) {
    cardContent = <div>
      <p>Error: {error}</p>
      <button onClick={setupCard}>Try again</button>
    </div>;
  } else if (card == undefined) {
    cardContent = <p>Loading...</p>;
  } else {
    cardContent = <p>Card opened in Anki. Review and come back.</p>
  }

  return (
  <div className="pt-2">
    
    <div className={`flex flex-col ${theme.BORDER}`}>
      {cardContent}
    </div>

  </div>
  );
}