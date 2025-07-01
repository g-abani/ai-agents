import { tool } from "@langchain/core/tools";
import { z } from "zod";

const bookFlight = tool(
    async (input: { from_airport: string; to_airport: string }) => {
      return `Successfully booked a flight from ${input.from_airport} to ${input.to_airport}.`;
    },
    {
      name: "book_flight",
      description: "Book a flight",
      schema: z.object({
        from_airport: z.string().describe("The departure airport code"),
        to_airport: z.string().describe("The arrival airport code"),
      }),
    }
  );
  export default bookFlight;