import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { invoke } from "../anki/anki";
import * as theme from "../utils/theme";
import { doneRep, finishRep, laterRep, stopLearning } from "./learnSlice";

interface Review {
  grade: number,
  interval: number
}

export default function CardComponent({ setBusy }: { setBusy: (busy: boolean) => void }) {
  const dispatch = useAppDispatch();
  const deckName = useAppSelector(state => state.anki.deckName);
  const qib = useAppSelector(state => state.learn.current!.qib);
  const cardId = qib.cardId!;
  const cardMedia = useAppSelector(state => state.anki.media);
  const card = React.useRef<any>();
  const [error, setError] = React.useState<string>();
  const [review, setReview] = React.useState<Review>();
  const cardReviewCount = React.useRef<number>(0);
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
      if (cardData.deck == deckName) {
        throw new Error(`Deck "${deckName}" is not empty. Resync anki to fix.`)
      }
      card.current = cardData;

      // 
      console.log(card.current);
      const reviewsCards = await invoke('getReviewsOfCards', { cards: [cardId] });
      const reviews = reviewsCards[cardId];
      console.log('init reviews', reviews);
      cardReviewCount.current = reviews.length;
      console.log(cardReviewCount.current);
      await invoke('changeDeck', { cards: [cardId], deck: deckName });
      await invoke('guiDeckReview', { name: deckName });
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
      const reviewsCards = await invoke('getReviewsOfCards', { cards: [cardId] });
      const reviews = reviewsCards[cardId];
      if (reviews.length > cardReviewCount.current) {
        // TODO: Handle multiple reviews done
        const review = reviews[reviews.length-1];
        setReview({ grade: review[3], interval: review[4] });
        clearInterval(pollTimer);
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