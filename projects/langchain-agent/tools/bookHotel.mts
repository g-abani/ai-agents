import { tool } from "@langchain/core/tools";
import { z } from "zod";

const bookHotel = tool(
    async (input: { hotel_name: string }) => {
        return `Successfully booked a stay at ${input.hotel_name}.`;
    },
    {
        name: "book_hotel",
        description: "Book a hotel",
        schema: z.object({
            hotel_name: z.string().describe("The name of the hotel to book"),
        }),
    }
);
export default bookHotel;