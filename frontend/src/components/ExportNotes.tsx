type ExportNotesProps = {
  messages: any[];
};

export default function ExportNotes({
  messages,
}: ExportNotesProps) {

  return (

    <div
      className="
        bg-[#ffffff]
        text-black
        p-4
        space-y-3
        w-[800px]
      "
      style={{
        overflow: "visible",
        height: "auto",
      }}
    >

      {/* Title */}
      <div className="space-y-0">

        <h1 className="text-2xl font-bold">
          MinAI Study Notes
        </h1>

        <p className="text-[#666666] text-xs mt-1">
          AI Generated Learning Material
        </p>

      </div>

      {/* Content */}
      {messages.map((msg, index) => {

        // Skip user messages
        if (msg.role !== "assistant")
          return null;

        // Skip file cards
        if (msg.type === "file")
          return null;

        // Skip welcome message
        if (
          msg.content?.includes(
            "Welcome to MinAI"
          )
        ) {
          return null;
        }

        const title =
          msg.type === "summary"
            ? "Summary"
            : msg.type === "quiz"
            ? "Quiz"
            : msg.type === "flashcards"
            ? "Flashcards"
            : "AI Response";

        return (

          <div
            key={index}
            className="
              border
              border-[#d1d5db]
              rounded-xl
              p-4
              space-y-3
              bg-white
            "
            style={{
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >

            <h2 className="text-lg font-semibold">
              {title}
            </h2>

            {/* FLASHCARDS */}
            {msg.type === "flashcards" ? (

              <div className="space-y-3">

                {msg.content
                  .split("## Flashcard")
                  .map(
                    (
                      card: string,
                      i: number
                    ) => {

                      if (!card.trim())
                        return null;

                      const qMatch =
                        card.match(
                          /Q:\s*(.*)/i
                        );

                      const aMatch =
                        card.match(
                          /A:\s*([\s\S]*)/i
                        );

                      return (

                        <div
                          key={i}
                          className="
                            border
                            border-[#e5e7eb]
                            rounded-lg
                            p-3
                            bg-[#f9fafb]
                            space-y-2
                          "
                          style={{
                            pageBreakInside:
                              "avoid",
                          }}
                        >

                          {/* Question */}
                          <div>

                            <p className="font-semibold text-sm">
                              Question
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-sm leading-5">
                              {
                                qMatch
                                  ? qMatch[1]
                                  : ""
                              }
                            </p>

                          </div>

                          {/* Answer */}
                          <div>

                            <p className="font-semibold text-sm">
                              Answer
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-sm leading-5">
                              {
                                aMatch
                                  ? aMatch[1]
                                  : ""
                              }
                            </p>

                          </div>

                        </div>

                      );

                    }
                  )}

              </div>

            ) : (

              <div
                className="
                  whitespace-pre-wrap
                  leading-6
                  text-[14px]
                "
              >
                {msg.content}
              </div>

            )}

          </div>

        );

      })}

    </div>

  );

}