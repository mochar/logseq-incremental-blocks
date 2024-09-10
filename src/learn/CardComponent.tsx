import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { invoke } from "../anki/anki";
import * as theme from "../utils/theme";
import { doneRep, finishRep, laterRep, stopLearning } from "./learnSlice";

const DECK_NAME = 'Incremental blocks';

interface Review {
  grade: number,
  interval: number
}

export default function CardComponent({ setBusy }: { setBusy: (busy: boolean) => void }) {
  const dispatch = useAppDispatch();
  const qib = useAppSelector(state => state.learn.current!.qib);
  const cardId = qib.cardId!;
  const cardMedia = useAppSelector(state => state.anki.media);
  const card = React.useRef<any>();
  const [error, setError] = React.useState<string>();
  const [review, setReview] = React.useState<Review>();
  const lastReviewTime = React.useRef<number>();
  const busy = error == undefined && card == undefined;
  let pollTimer: NodeJS.Timeout;

  React.useEffect(() => {
    setupCard();
    return () => {
      clearInterval(pollTimer);
      wrapUpReview();
    };
  }, [qib]);

  async function setupCard() {
    setBusy(true);
    card.current = undefined;
    setError(undefined);
    try {
      const cardsData = await invoke('cardsInfo', { cards: [cardId] });
      if (cardsData.length == 0) throw new Error('Failed to fetch card.');
      const cardData = cardsData[0];
      if (cardData.deck == DECK_NAME) {
        throw new Error(`Deck "${DECK_NAME}" is not empty. Resync anki to fix.`)
      }
      card.current = cardData;

      // First make sure our deck is empty, as the system works by having
      // only one card in the deck at any moment of time. If deck doesn't
      // exist it is ok, it will be created with changeDeck call later.
      const deckStats = await invoke('getDeckStats', { decks: [DECK_NAME] }) as Map<string, any>;
      console.log('deck stats', deckStats);
      if (Object.values(deckStats).length == 1) {
        console.log('total in deck', Object.values(deckStats)[0].total_in_deck)
        const nCards = Object.values(deckStats)[0].total_in_deck;
        if (nCards > 0) {
          throw Error(`Deck "${DECK_NAME}" is not empty. Resync anki to fix.`);
        }
      }

      // 
      console.log(card.current);
      const reviewsCards = await invoke('getReviewsOfCards', { cards: [cardId] });
      const reviews = reviewsCards[cardId];
      console.log('init reviews', reviews);
      lastReviewTime.current = reviews.length > 0 ? reviews[reviews.length-1].id : 0;
      console.log(lastReviewTime.current);
      await invoke('changeDeck', { cards: [cardId], deck: DECK_NAME });
      await invoke('guiDeckReview', { name: DECK_NAME });
      await invoke('guiShowQuestion');
      pollTimer = setInterval(pollReviewTime, 100);
    } catch (error: any) {
      setError(error.toString());
    } finally {
      setBusy(false);
    }
  }

  async function pollReviewTime() {
    try {
      const reviews = await invoke('cardReviews', 
        { deck: DECK_NAME, startID: lastReviewTime.current });
      if (reviews.length > 0) {
        // TODO: Handle multiple reviews done
        const review = reviews[0];
        setReview({ grade: review[3], interval: review[4] });
        wrapUpReview();
        return;
      }
    } catch (error) {
    }
  }
  
  async function wrapUpReview() {
    try {
      await invoke('guiDeckBrowser');
      console.log('wrap up', card.current);
      if (card.current) {
        await invoke('changeDeck', { cards: [cardId], deck: card.current.deckName });
      }
    } catch (error) {
    }
  }

  async function finish() {
    if (review == undefined) return;
    setBusy(true);
    if (review.interval < 1) {
      await dispatch(laterRep());
    } else {
      await dispatch(finishRep());
    }
    setBusy(false);
  }

  async function done() {
    setBusy(true);
    await dispatch(doneRep());
    setBusy(false);
  }

  async function later() {
    if (review) return;
    setBusy(true);
    await dispatch(laterRep());
    setBusy(false);
  }

  function quit() {
    dispatch(stopLearning());
  }

  let cardContent = <></>;
  if (error) {
    cardContent = <div>
      <p>{error}</p>
      <button className={`p-1 ${theme.BG.hover} ${theme.BORDER}`} onClick={setupCard}>Try again</button>
    </div>;
  } else if (card.current == undefined) {
    cardContent = <p>Loading...</p>;
  } else if (review) {
    cardContent = <p>Answered with grade {review.grade}.</p>
  } else {
    cardContent = <p>Card opened in Anki. Review and come back.</p>
  }

  return (
  <>
    
    <div className={`flex flex-col mt-2 p-1 ${theme.BORDER}`}>
      {cardContent}
    </div>

    <hr className="dark:border-gray-800"></hr>

    <div className="flex justify-between pt-2">
      <button 
        className="w-fit bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
        onClick={finish}
        disabled={review == undefined}
      >
        Next rep
      </button>
      {review == undefined && <button 
        className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-2 w-1/6 rounded`} 
        onClick={later}
      >
        Later
      </button>}
      <button 
        className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-2 w-1/6 rounded`} 
        onClick={done}
      >
        Done
      </button>
      <div className="flex-grow"></div>
      <button 
        className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 w-1/6 rounded`}
        onClick={quit}
      >
        Quit
      </button>
    </div>

  </>
  );
}