import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { CurrentIBData, stopLearning } from "./learnSlice";
import { invoke } from "../anki/anki";
import * as theme from "../utils/theme";

export default function CardComponent({ currentIbData }: { currentIbData: CurrentIBData }) {
  const dispatch = useAppDispatch();
  const cardId = currentIbData.qib.cardId!;
  const cardMedia = useAppSelector(state => state.anki.media);
  const [card, setCard] = React.useState();
  const [error, setError] = React.useState<string>();
  const [showAnswer, setShowAnser] = React.useState<boolean>(false);
  const busy = error == undefined && card == undefined;

  React.useEffect(() => {
    setShowAnser(false);
    setCard(undefined);
    setError(undefined);
    getCardData();
  }, [currentIbData]);

  async function getCardData() {
    try {
      const cardsData = await invoke('cardsInfo', { cards: [cardId] });
      if (cardsData.length == 1) {
        setCard(cardsData[0]);
      } else {
        setError('Failed to fetch card.')
      }
    } catch (error) {
      setError(error as string);
    }
  }

  async function later() {

  }

  function quit() {
    dispatch(stopLearning());
  }

  let cardContent = <></>;
  if (error) {
    cardContent = <p>Error: {error}</p>;
  } else if (card == undefined) {
    cardContent = <p>Loading...</p>;
  } else if (showAnswer) {
    cardContent = <iframe srcDoc={cardMedia.back + card['answer']}></iframe>
  } else {
    cardContent = <iframe srcDoc={cardMedia.front + card['question']}></iframe>
  }

  return (
  <div className="pt-2">
    
    <div className="flex items-center justify-between">
      <p>Card</p>
    </div>

    <div className={`flex flex-col ${theme.BORDER} border-b-4`}>
      {cardContent}
    </div>

    <div className="flex justify-between pt-2">
        <button 
          className="w-fit bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
          disabled={busy}
          onClick={() => setShowAnser(true)}
        >
          Show answer
        </button>
        <button 
          className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-2 w-1/6 rounded`} 
          onClick={later}
        >
          Later
        </button>
        <div className="flex-grow"></div>
        <button 
          className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 w-1/6 rounded`}
          onClick={quit}
        >
          Quit
        </button>
      </div>
  </div>
  );
}