import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { extractSourcesFromCard, invoke } from "../anki/anki";
import * as theme from "../utils/theme";
import { doneRep, finishRep, laterRep, stopLearning } from "./learnSlice";

export default function CardComponent({ setBusy }: { setBusy: (busy: boolean) => void }) {
  const dispatch = useAppDispatch();
  const deckName = useAppSelector(state => state.anki.deckName);
  const qib = useAppSelector(state => state.learn.current!.qib);
  const cardId = qib.cardId!;
  const [card, setCard] = React.useState();
  const [error, setError] = React.useState<string>();
  const busy = error == undefined && card == undefined;

  React.useEffect(() => {
    setupCard();
    return () => {
      wrapUpReview();
    };
  }, [qib]);

  async function setupCard() {
    setBusy(true);
    setCard(undefined);
    setError(undefined);
    try {
      const cardsData = await invoke('cardsInfo', { cards: [cardId] });
      if (cardsData.length == 0) throw new Error('Failed to fetch card.');
      const cardData = cardsData[0];
      console.log(cardData);

      const sources = await extractSourcesFromCard(cardData.question);
      for (const [s, v] of sources) {
        //cardData.question = cardData.question.replace(/<script src\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '')
        cardData.question = cardData.question.replace(new RegExp(s, 'g'), `${v}`);
      }

      setCard(cardData);

    } catch (error: any) {
      setError(error.toString());
    } finally {
      setBusy(false);
    }
  }

  function showAnswer() {

  }
  
  async function wrapUpReview() {
    try {
      console.log('wrap up', card);
    } catch (error) {
    }
  }

  async function done() {
    setBusy(true);
    await dispatch(doneRep());
    setBusy(false);
  }

  async function later() {
    setBusy(true);
    await dispatch(laterRep({}));
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
  } else if (card == undefined) {
    cardContent = <p>Loading...</p>;
  } else {
    cardContent = <CardFrontView card={card} />;
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
        onClick={() => showAnswer()}
      >
        Show answer
      </button>

      <div className="flex-grow"></div>

      <button 
        className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-2 w-1/6 rounded`} 
        onClick={later}
      >
        Later
      </button>
      <button 
        className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-2 w-1/6 rounded`} 
        onClick={done}
      >
        Done
      </button>
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

interface Grade {
  label: string,
  ease: number,
  delay: string
}

function CardFrontView({ card }: { card: any }) {
  const ref  = React.useRef<HTMLDivElement>(null);
  const cardMedia = useAppSelector(state => state.anki.media);

  React.useEffect(() => {
    if (!ref.current) return;
    //ref.current.innerHTML = cardMedia.front + card['question'];
    //ref.current.innerHTML = card['question'];

    const shadow = ref.current.attachShadow({ mode: "open" });
    const div = document.createElement('div');
    div.innerHTML =  cardMedia.front + card['question'];
    shadow.appendChild(div);
  }, []);

  return (
  <div>
    <div ref={ref} className={`flex flex-col mt-2 p-1 ${theme.BORDER}`}>
      {/* <iframe srcDoc={cardMedia.front + card['question']}></iframe> */}
    </div>
  </div>
  );
}

function CardBackView({ card }: { card: any }) {
  const cardMedia = useAppSelector(state => state.anki.media);

  const grades = [0,1,2,3].map<Grade>((i) => {
    return {
      label: ['Again', 'Hard', 'Good', 'Easy'][i],
      ease: i + 1,
      delay: card.nextReviews[i] as string
    }
  });

  async function answer(grade: Grade) {

  }

  const answerButtons = grades.map((grade) => {
    return <button 
      className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-2 w-1/6 rounded`} 
      onClick={() => answer(grade)}
    >
      { grade.label } ({ grade.delay })
    </button>;
  });

  return (
  <div>
    <div className="flex justify-between pt-2">
      { answerButtons }
    </div>
  </div>
  );
}
