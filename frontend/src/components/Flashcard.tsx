"use client";

import { useState } from "react";

type FlashcardProps = {
  content: string;
};

export default function Flashcard({
  content,
}: FlashcardProps) {

  const [flippedCards, setFlippedCards] =
    useState<{ [key: string]: boolean }>({});

  function parseFlashcards(
    content: string
  ) {

    const cards = [];

    const sections =
      content.split("## Flashcard");

    for (const section of sections) {

      const qMatch = section.match(
        /Q:\s*(.*)/i
      );

      const aMatch = section.match(
        /A:\s*([\s\S]*)/i
      );

      if (qMatch && aMatch) {

        cards.push({
          question: qMatch[1].trim(),
          answer: aMatch[1].trim(),
        });

      }

    }

    return cards;
  }

  const cards =
    parseFlashcards(content);

  return (

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {cards.map(
        (card: any, index: number) => {

          const flipped =
            flippedCards[index];

          return (

            <div
              key={index}
              onClick={() =>
                setFlippedCards((prev) => ({
                  ...prev,
                  [index]: !prev[index],
                }))
              }
              className="
                cursor-pointer
                perspective
              "
            >

              <div
                className={`
                  relative
                  h-64
                  rounded-3xl
                  transition-transform
                  duration-500
                  transform-style-preserve-3d
                  ${
                    flipped
                      ? "rotate-y-180"
                      : ""
                  }
                `}
              >

                {/* FRONT */}
                <div
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-br
                    from-green-600
                    to-emerald-700
                    rounded-3xl
                    p-6
                    flex
                    flex-col
                    justify-between
                    backface-hidden
                    shadow-xl
                  "
                  style={{
                    transform: "rotateY(0deg)",
                  }}
                >

                  <div className="text-sm opacity-80">
                    Flashcard
                  </div>

                  <div className="text-xl font-semibold">
                    {card.question}
                  </div>

                  <div className="text-sm opacity-70">
                    Click to reveal answer
                  </div>

                </div>

                {/* BACK */}
                <div
                  className="
                    absolute
                    inset-0
                    bg-[#1A1A1A]
                    border
                    border-[#2A2A2A]
                    rounded-3xl
                    p-6
                    flex
                    flex-col
                    justify-between
                    backface-hidden
                    shadow-xl
                  "
                  style={{
                    transform: "rotateY(180deg)",
                  }}
                >

                  <div className="text-sm text-gray-400">
                    Answer
                  </div>

                  <div className="text-base text-gray-200 overflow-y-auto">
                    {card.answer}
                  </div>

                  <div className="text-sm text-gray-500">
                    Click to flip back
                  </div>

                </div>

              </div>

            </div>

          );

        }
      )}

    </div>

  );
}